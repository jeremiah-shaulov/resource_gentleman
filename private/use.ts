/**	Wraps a Promise to a Disposable object, that can be bound to a await-using statement.
	This guarantees that the promise is awaited at the end of the block, even if the caller does not await it.
	Awaiting the promise in Deno is important.
	Not awaiting a rejected promise can lead to unhandled promise rejections, which can cause the Deno process to terminate.
	In the other hand, it's quite easy to miss the awaiting, when an exception is thrown in the middle of the block.

	Rejected and not explicitly awaited promise will throw exception at the end of the block.
	If the promise was awaited in the block, the exception will be thrown only at the point of awaiting, and will be ignored at the end of the block.

	Example:
	```ts
	// To run this example:
	// deno run --allow-read --allow-write example.ts

	import {use} from '../mod.ts';

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
 **/
export function use<T>(promise: Promise<T>)
{	return new UsedPromise(promise);
}

class UsedPromise<T>
{	/**	Did the user catch error from this promise?
	 **/
	#cought = false;

	constructor(private promise: Promise<T>)
	{
	}

	/**	Attaches callbacks for the resolution and/or rejection of the Promise.
		@param onfulfilled The callback to execute when the Promise is resolved.
		@param onrejected The callback to execute when the Promise is rejected.
		@returns A Promise for the completion of which ever callback is executed.
	 **/
	then<Y=T, N=never>(onfulfilled?: ((value: T) => Y|PromiseLike<Y>) | null | undefined, onrejected?: ((reason: unknown) => N|PromiseLike<N>) | null | undefined): Promise<Y|N>
	{	this.#cought ||= !!onrejected;
		return this.promise.then(onfulfilled, onrejected);
	}

	/**	Attaches a callback for only the rejection of the Promise.
		@param onrejected The callback to execute when the Promise is rejected.
		@returns A Promise for the completion of the callback.
	 **/
	catch<N=never>(onrejected?: ((reason: unknown) => N|PromiseLike<N>) | null | undefined): Promise<T|N>
	{	this.#cought = true;
		return this.promise.catch(onrejected);
	}

	/**	Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
		resolved value cannot be modified from the callback.
		@param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
		@returns A Promise for the completion of the callback.
	 **/
	finally(onfinally?: VoidFunction|null|undefined): Promise<T>
	{	return this.promise.finally(onfinally);
	}

	async [Symbol.asyncDispose]()
	{	if (!this.#cought)
		{	await this.promise;
		}
		else
		{	await this.promise.catch(() => {});
		}
	}
}
