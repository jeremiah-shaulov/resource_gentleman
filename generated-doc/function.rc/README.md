# `function` rc

[Documentation Index](../README.md)

```ts
import {rc} from "https://raw.githubusercontent.com/jeremiah-shaulov/resource_gentleman/v0.0.1/mod.ts"
```

`function` rc\<T `extends` Disposable | AsyncDisposable>(subj: T): Rc

This function converts a disposable object (one that implements `Symbol.dispose` or `Symbol.asyncDispose` methods)
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
// To download and run this example:
// curl 'https://raw.githubusercontent.com/jeremiah-shaulov/resource_gentleman/v0.0.1/generated-doc/function.rc/README.md' | perl -ne 's/^> //; $y=$1 if /^```(.)?/; print $_ if $y&&$m; $m=$y&&$m+/<example-hemm>/' > /tmp/example-hemm.ts
// deno run --allow-read --allow-write /tmp/example-hemm.ts

import {rc} from 'https://raw.githubusercontent.com/jeremiah-shaulov/resource_gentleman/v0.0.1/mod.ts';

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
// To download and run this example:
// curl 'https://raw.githubusercontent.com/jeremiah-shaulov/resource_gentleman/v0.0.1/generated-doc/function.rc/README.md' | perl -ne 's/^> //; $y=$1 if /^```(.)?/; print $_ if $y&&$m; $m=$y&&$m+/<example-5equ>/' > /tmp/example-5equ.ts
// deno run --allow-read --allow-write /tmp/example-5equ.ts

import {rc} from 'https://raw.githubusercontent.com/jeremiah-shaulov/resource_gentleman/v0.0.1/mod.ts';

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
// To download and run this example:
// curl 'https://raw.githubusercontent.com/jeremiah-shaulov/resource_gentleman/v0.0.1/generated-doc/function.rc/README.md' | perl -ne 's/^> //; $y=$1 if /^```(.)?/; print $_ if $y&&$m; $m=$y&&$m+/<example-mnxj>/' > /tmp/example-mnxj.ts
// deno run --allow-read --allow-write /tmp/example-mnxj.ts

import {rc} from 'https://raw.githubusercontent.com/jeremiah-shaulov/resource_gentleman/v0.0.1/mod.ts';

async function processFile(fd: Deno.FsFile)
{	using fd2 = rc(fd);
	await fd2.write(new TextEncoder().encode('Hello World\n'));
}

using fd = rc(await Deno.open('/tmp/test.txt', {create: true, write: true}));
await processFile(fd);
```

