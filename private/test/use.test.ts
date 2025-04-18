import {use} from '../use.ts';
import {assertEquals} from 'jsr:@std/assert@1.0.7/equals';
import {assertRejects} from 'jsr:@std/assert@1.0.7/rejects';

function delay(ms: number): Promise<void>
{	return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.test
(	"use() - basic usage",
	async () =>
	{	let resolved = false;

		// deno-lint-ignore require-await
		async function task()
		{	resolved = true;
			return "success";
		}

		await using promise = use(task());

		const result = await promise;
		assertEquals(result, "success");
		assertEquals(resolved, true);
	}
);

Deno.test
(	"use() - with rejected promise",
	async () =>
	{	await assertRejects
		(	async () =>
			{	await using errorPromise = use(Promise.reject(new Error("test error")));
				await errorPromise; // This should throw
			},
			Error,
			"test error"
		);
	}
);

Deno.test
(	"use() - with rejected promise, not awaited",
	async () =>
	{	await assertRejects
		(	async () =>
			{	await using _errorPromise1 = use(Promise.reject(new Error("test error 1")));
				await using _errorPromise2 = use(Promise.reject(new Error("test error 2")));
			},
			Error,
			"An error was suppressed during disposal."
		);
	}
);

Deno.test
(	"use() - promise methods forwarding",
	async () =>
	{	// Test then()
		{	let thenCalled = false;
			await using promise = use(Promise.resolve("then test"));
			await promise.then
			(	value =>
				{	assertEquals(value, "then test");
					thenCalled = true;
				}
			);
			assertEquals(thenCalled, true);
		}

		// Test catch()
		{	let catchCalled = false;
			await using promise = use(Promise.reject(new Error("catch test")));
			await promise.catch
			(	err =>
				{	assertEquals(err instanceof Error && err.message, "catch test");
					catchCalled = true;
				}
			);
			assertEquals(catchCalled, true);
		}

		// Test finally()
		{	let finallyCalled = false;
			await using promise = use(Promise.resolve("finally test"));
			await promise.finally
			(	() =>
				{	finallyCalled = true;
				}
			);
			assertEquals(finallyCalled, true);
		}
	}
);

Deno.test
(	"use() - multiple promises in parallel",
	async () =>
	{	const results = new Array<string>;

		async function task1()
		{	await delay(10);
			results.push("task1");
			return "result1";
		}

		async function task2()
		{	await delay(5);
			results.push("task2");
			return "result2";
		}

		await using promise1 = use(task1());
		await using promise2 = use(task2());

		const result2 = await promise2;
		assertEquals(result2, "result2");

		const result1 = await promise1;
		assertEquals(result1, "result1");

		// task2 should complete before task1 due to timing
		assertEquals(results, ["task2", "task1"]);
	}
);

Deno.test
(	"use() - promise is awaited even with exceptions",
	async () =>
	{	let promiseCompleted = false;

		async function task()
		{	await delay(10);
			promiseCompleted = true;
			return "completed";
		}

		try
		{	await using _promise = use(task());
			throw new Error("Block exception");
		}
		catch (e)
		{	assertEquals(e instanceof Error && e.message, "Block exception");
		}

		// The promise should still be completed even though an exception was thrown
		assertEquals(promiseCompleted, true);
	}
);