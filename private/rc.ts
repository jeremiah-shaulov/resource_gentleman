export type Rc<T> = T &
{	/**	This method increments the reference counter and returns the same object.
		And it registers a callback to decrement the counter after the next event loop tick.

		This allows to return the object from a function where it's bound to a "using" variable.
	 **/
	rcKeep(): T;
};

// deno-lint-ignore no-explicit-any
type Any = any;

const _useCnt = Symbol();

const deferred = new Array<() => void>;
let deferredScheduled = false;

function deferredSchedule(callback: () => void)
{	deferred.push(callback);
	if (!deferredScheduled)
	{	deferredScheduled = true;
		setTimeout
		(	() =>
			{	deferredScheduled = false;
				while (deferred.length > 0)
				{	const {length} = deferred;
					for (let i=0; i<length; i++)
					{	deferred[i]();
					}
					deferred.splice(0, length);
				}
			},
			0
		);
	}
}

/**	This function converts a disposable object (one that implements `Symbol.dispose` or `Symbol.asyncDispose` methods)
	into a reference counted object.

	The returned object is a proxy wrapper around the original object, which keeps track of the number of references to it.

	If you call `rc(obj)` on a disposable object of type `T`, it will return `Rc<T>`,
	which is the same as `T` but with an additional method `rcKeep()`.

	If you call `rc(rcObj)` on an object that is already a reference counted one,
	it increments the reference counter and returns the same object.

	Calling `Symbol.dispose` or `Symbol.asyncDispose` on the returned object will decrement the reference counter,
	and when it reaches zero, the original object will be disposed of.

	Example:
	```ts
	// To run this example:
	// deno run --allow-read --allow-write example.ts

	import {rc} from '../mod.ts';

	// Create a reference counted resource
	using fd = rc(await Deno.open('/tmp/test.txt', {create: true, write: true}));
	// Now reference counter is 1

	{	// Create another copy of the reference
		using fd2 = rc(fd);
		// Now `fd2 == fd`, and the reference counter is 2
		await fd2.write(new TextEncoder().encode('Hello World\n'));

		// Now `fd2` will be disposed of, but the underlying resource will remain open
	}
	// Here the reference counter is 1 again

	await fd.write(new TextEncoder().encode('Hello World\n'));

	// Now `fd` gets disposed of, and the underlying resource will be closed
	```

	Method `rcKeep()` can be used to keep the object alive for a longer time.
	It will increment the reference counter and return the same object.
	And it will register a callback to decrement the counter with `setTimeout(callback, 0)`.
	This allows to return the object from a function where it's bound to a "using" variable.

	Example:
	```ts
	// To run this example:
	// deno run --allow-read --allow-write example.ts

	import {rc} from '../mod.ts';

	async function getFile()
	{	using fd = rc(await Deno.open('/tmp/test.txt', {create: true, write: true}));
		await fd.write(new TextEncoder().encode('Hello World\n'));
		return fd.rcKeep();
	}

	using fd2 = rc(await getFile());
	await fd2.write(new TextEncoder().encode('Hello World\n'));
	```

	When `getFile()` returned the object, `rcKeep()` incremented the reference counter.
	Then on the receiving side, `rc()` was called, which incremented the counter again.
	After 0 milliseconds `rcKeep()` decremented the counter.
	And finally at the end of the block where `fd2` is declared, the counter was decremented to zero,
	and the resource was closed.

	Without `rc()` on the receiving side, the resource would be closed immediately after `getFile()` returned,
	and the `fd2` would be invalid.

	Calling `getFile()` without using the result doesn't leak the resource.
	In this case, if the returned promise becomes rejected, the corresponding error message will be printed to the console.

	To pass the reference counted object to another function, where it will be bound to a variable, do like this:

	```ts
	// To run this example:
	// deno run --allow-read --allow-write example.ts

	import {rc} from '../mod.ts';

	async function processFile(fd: Deno.FsFile)
	{	using fd2 = rc(fd);
		await fd2.write(new TextEncoder().encode('Hello World\n'));
	}

	using fd = rc(await Deno.open('/tmp/test.txt', {create: true, write: true}));
	await processFile(fd);
	```
 **/
export function rc<T extends Disposable|AsyncDisposable>(subj: T): Rc<T>
{	let useCnt = (subj as Any)[_useCnt];
	if (typeof(useCnt) == 'number')
	{	(subj as Any)[_useCnt] = useCnt + 1;
		return subj as Any;
	}
	useCnt = 1;
	return new Proxy
	(	subj,
		{	get(target, prop)
			{	if (prop == _useCnt)
				{	return useCnt;
				}
				if (prop==Symbol.dispose || prop==Symbol.asyncDispose)
				{	const dispose = (target as Any)[prop];
					return dispose && function()
					{	if (--useCnt == 0)
						{	return dispose.call(target);
						}
						if (prop == Symbol.asyncDispose)
						{	return Promise.resolve();
						}
					};
				}
				if (prop === 'rcKeep')
				{	return function(this: Any)
					{	useCnt++;
						deferredSchedule
						(	() =>
							{	if (--useCnt == 0)
								{	try
									{	const asyncDispose = (subj as Any)[Symbol.asyncDispose];
										if (asyncDispose)
										{	asyncDispose.call(subj).catch((e: Any) => console.error('Error during async disposal', e));
										}
										else
										{	(subj as Any)[Symbol.dispose]();
										}
									}
									catch (e)
									{	console.error('Error during object disposal', e);
									}
								}
							}
						);
						return this;
					};
				}
				const res = Reflect.get(target, prop);
				return typeof(res)!='function' ? res : res.bind(target);
			},

			set(target, prop, value)
			{	if (prop == _useCnt)
				{	useCnt++;
					return true;
				}
				return Reflect.set(target, prop, value);
			},
		}
	) as Any;
}
