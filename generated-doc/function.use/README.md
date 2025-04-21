# `function` use

[Documentation Index](../README.md)

```ts
import {use} from "https://raw.githubusercontent.com/jeremiah-shaulov/resource_gentleman/v0.0.2/mod.ts"
```

`function` use\<T>(promise: Promise\<T>): [UsedPromise](../private.class.UsedPromise/README.md)\<T>

Wraps a Promise to a Disposable object, that can be bound to a await-using statement.
This guarantees that the promise is awaited at the end of the block, even if the caller does not await it.
Awaiting the promise in Deno is important.
Not awaiting a rejected promise can lead to unhandled promise rejections, which can cause the Deno process to terminate.
In the other hand, it's quite easy to miss the awaiting, when an exception is thrown in the middle of the block.

Rejected and not explicitly awaited promise will throw exception at the end of the block.
If the promise was awaited in the block, the exception will be thrown only at the point of awaiting, and will be ignored at the end of the block.

Example:
```ts
// To download and run this example:
// curl 'https://raw.githubusercontent.com/jeremiah-shaulov/resource_gentleman/v0.0.2/generated-doc/function.use/README.md' | perl -ne 's/^> //; $y=$1 if /^```(.)?/; print $_ if $y&&$m; $m=$y&&$m+/<example-7ic5>/' > /tmp/example-7ic5.ts
// deno run --allow-read --allow-write /tmp/example-7ic5.ts

import {use} from 'https://raw.githubusercontent.com/jeremiah-shaulov/resource_gentleman/v0.0.2/mod.ts';

async function download(url: string)
{	const resp = await fetch(url);
	return await resp.text();
}

try
{	// Start 2 tasks in parallel (problem starts here)
	await using promise1 = use(download('https://example.com/page1.html'));
	await using promise2 = use(download('https://example.com/page2.html'));

	// Handle the first task
	console.log(await promise1); // If this throws, the promise2 will be awaited at the end of the block

	// Handle the second task
	console.log(await promise2);
}
catch (e)
{	console.error('Error:', e);
}

console.log('Done');
```

