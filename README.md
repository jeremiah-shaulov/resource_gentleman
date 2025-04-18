<!--
	This file is generated with the following command:
	deno run --allow-all https://raw.githubusercontent.com/jeremiah-shaulov/tsa/v0.0.50/tsa.ts doc-md --outFile=README.md mod.ts
-->

# resource_gentleman - Reference counting in TypeScript.

[Documentation Index](generated-doc/README.md)

How do ladies and gentlemen manage their resource handles?
Doing this without special tools is the main headache and source of bugs.

This library features 2 design patterns that take care of 2 the most common problems in resource management:

1. Reference counting - A pattern that gentlemen use against leaking or double-freeing resources.
2. Promise binding - A pattern that assists to all the gentlemen in situations where one of the promises in the application can be suddenly rejected, leading to Deno process termination.

## Reference counting

Any disposable resource can be bound to a "using" variable, and so be automatically disposed of at the end of the block.
This kind of automatic resource management works well when the resource is used in a single place in the code,
so there is only 1 variable that owns it.

In situations where we want to transfer the ownership of the resource to another variable,
by passing it to a function or returning it from a function,
or in situations where we need multiple simultaneous owners,
this technique is not enough.

Reference counting is used to solve this problem.
We can wrap the resource in another object, that will count how many owners of this resource exist,
and will dispose of the resource when all owners are gone.

To create a reference counted object, use [rc()](generated-doc/function.rc/README.md) function from this library, and bind it's result to a "using" (or "await-using") variable.

```ts
// To run this example:
// deno run --allow-read --allow-write example.ts

import {rc} from './mod.ts';

// Create a reference counted resource
using fd = rc(await Deno.open('/tmp/test.txt', {create: true, write: true}));
await fd.write(new TextEncoder().encode('Hello World\n'));
```

The [rc()](generated-doc/function.rc/README.md) function takes a disposable or async-disposable resource and returns an identical object, with a reference counter attached to it.
The counter starts at 1.
At the end of the block, `Symbol.dispose` is called on the object, which decrements the counter.
The resource is freed when the counter reaches zero.

If the object given to [rc()](generated-doc/function.rc/README.md) is already a reference counted object, the counter is incremented and the same object instance is returned.

```ts
// To run this example:
// deno run --allow-read --allow-write example.ts

import {rc} from './mod.ts';

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

Technically, the object returned by [rc()](generated-doc/function.rc/README.md) is a `Proxy` wrapper around the original object.
It adds the reference counter, and 1 additional method to the object:

- `Rc.rcKeep()` - This method can be used to keep the object alive for a longer time.
If during this time you rebind the object to another "using" variable, it will remain alive.
`Rc.rcKeep()` registers a callback with `setTimeout(callback, 0)`,
and until it gets called you can rebind the object.

```ts
// To run this example:
// deno run --allow-read --allow-write example.ts

import {rc} from './mod.ts';

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
On the next tick the counter will be decremented.
And finally at the end of the block where `fd2` is declared, the counter will be decremented to zero,
and the resource will be closed.

Without `rc()` on the receiving side, the resource would be closed immediately after `getFile()` returned,
and the `fd2` would be invalid.

Calling `getFile()` without using the result doesn't leak the resource.
In this case, if the returned promise becomes rejected, the corresponding error message will be printed to the console.

To pass the reference counted object to another function, where it will be bound to a variable, do like this:

```ts
// To run this example:
// deno run --allow-read --allow-write example.ts

import {rc} from './mod.ts';

async function processFile(fd: Deno.FsFile)
{	using fd2 = rc(fd);
	await fd2.write(new TextEncoder().encode('Hello World\n'));
}

using fd = rc(await Deno.open('/tmp/test.txt', {create: true, write: true}));
await processFile(fd);
```

## Promise binding

Another design pattern that this library introduces is promise binding.

The simplest way to run 2 tasks in parallel is to start both of them, getting their promises,
then awaiting the first of them, handling the result, then awaiting the other one, etc.

Don't do this way. Here is what will happen:

```ts
// To run this example:
// deno run --allow-read --allow-write example.ts

async function download(url: string)
{	const resp = await fetch(url);
	return await resp.text();
}

try
{	// Start 2 tasks in parallel (problem starts here)
	const promise1 = download('https://example.com/page1.html');
	const promise2 = download('https://example.com/page2.html');

	// Handle the first task
	console.log(await promise1); // [!] Think what happens if this promise is rejected

	// Handle the second task
	console.log(await promise2);
}
catch (e)
{	console.error('Error:', e);
}

console.log('Done');

```

If `await promise1` throws an error, we'll never reach `await promise2`, and guess what will happen?
Boom! The Deno process will terminate.

Deno operates in such a way that error that occurs for one application user can terminate the whole application.

Good news is that you can approach [use()](generated-doc/function.use/README.md) function from this library to take care of business.
This function converts any promise to a disposable object, that can be bound to an "await-using" variable.
At the end of the block this promise will be awaited, even if the caller does not await it.
Rejected and not explicitly awaited promise will throw exception at the end of the block.

```ts
// To run this example:
// deno run --allow-read --allow-write example.ts

import {use} from './mod.ts';

async function download(url: string)
{	const resp = await fetch(url);
	return await resp.text();
}

try
{	// Start 2 tasks in parallel (problem starts here)
	await using promise1 = use(download('https://example.com/page1.html'));
	await using promise2 = use(download('https://example.com/page2.html'));

	// Handle the first task
	console.log(await promise1);

	// Handle the second task
	console.log(await promise2);
}
catch (e)
{	console.error('Error:', e);
}

console.log('Done');
```