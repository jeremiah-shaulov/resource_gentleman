import {rc} from '../rc.ts';
import {assertEquals} from 'jsr:@std/assert@1.0.7/equals';
import {assertStrictEquals} from 'jsr:@std/assert@1.0.7/strict-equals';

Deno.test
(	'rc() - reference counting',
	() =>
	{	// Create a mock disposable object
		let disposed = false;
		const mockDisposable =
		{	[Symbol.dispose]()
			{	disposed = true;
			}
		};

		// Test initial reference counting
		const rcObj = rc(mockDisposable);
		assertEquals(disposed, false, "Object should not be disposed initially");

		// Test disposing decrements counter and disposes when zero
		rcObj[Symbol.dispose]();
		assertEquals(disposed, true, "Object should be disposed when counter reaches zero");

		// Test multiple references
		disposed = false;

		const rcObj1 = rc(mockDisposable);
		const rcObj2 = rc(rcObj1);

		// Verify they're the same object
		assertStrictEquals(rcObj1, rcObj2, "rc() should return the same object for already rc-wrapped object");

		// First dispose shouldn't dispose the object
		rcObj1[Symbol.dispose]();
		assertEquals(disposed, false, "Object should not be disposed when counter > 0");

		// Second dispose should dispose the object
		rcObj2[Symbol.dispose]();
		assertEquals(disposed, true, "Object should be disposed when counter reaches zero");
	}
);

Deno.test
(	'rc() - rcKeep method',
	async () =>
	{	let disposed1 = false;
		const mockDisposable1 =
		{	[Symbol.dispose]()
			{	disposed1 = true;
			}
		};

		let disposed2 = false;
		const mockDisposable2 =
		{	[Symbol.dispose]()
			{	disposed2 = true;
			}
		};

		// Function that simulates returning a kept resource
		async function getResource(mockDisposable: Disposable)
		{	using resource = rc(mockDisposable);
			await Promise.resolve();
			return resource.rcKeep();
		}

		const resource1 = rc(await getResource(mockDisposable1));
		assertEquals(disposed1, false, "Object should not be disposed after rcKeep");
		resource1[Symbol.dispose]();

		const resource2 = rc(await getResource(mockDisposable2));
		assertEquals(disposed2, false, "Object should not be disposed after rcKeep");
		resource2[Symbol.dispose]();

		assertEquals(disposed1, false, "Object should not be disposed until the next setTimeout tick");
		assertEquals(disposed2, false, "Object should not be disposed until the next setTimeout tick");

		// After next setTimeout tick, rcKeep's callback should decrement the counter
		await new Promise(y => setTimeout(y, 10));
		assertEquals(disposed1, true, "Object should be disposed after rcKeep's callback executes");
		assertEquals(disposed2, true, "Object should be disposed after rcKeep's callback executes");
	}
);

Deno.test
(	'rc() - async disposal',
	async () =>
	{	let disposed = false;
		const mockAsyncDisposable =
		{	async [Symbol.asyncDispose]()
			{	await new Promise(y => setTimeout(y, 10));
				disposed = true;
			}
		};

		// Test async disposal
		const rcObj = rc(mockAsyncDisposable);
		await rcObj[Symbol.asyncDispose]();
		assertEquals(disposed, true, "Object should be disposed asynchronously");

		// Test multiple async references
		disposed = false;

		const rcObj2 = rc(mockAsyncDisposable);
		const rcObj2Copy = rc(rcObj2);

		// First async dispose should return resolved promise but not dispose
		await rcObj2[Symbol.asyncDispose]();
		assertEquals(disposed, false, "Object should not be disposed when counter > 0");

		// Second async dispose should actually dispose
		await rcObj2Copy[Symbol.asyncDispose]();
		assertEquals(disposed, true, "Object should be disposed when counter reaches zero");
	}
);

Deno.test
(	'rc() - simulated file example',
	() =>
	{	// Mock file-like object
		let closeCount = 0;
		let writeCount = 0;

		class MockFile
		{	[Symbol.dispose]()
			{	closeCount++;
			}

			write()
			{	writeCount++;
			}
		}

		// Function that processes a file
		function processFile(file: MockFile)
		{	using fileCopy = rc(file);
			fileCopy.write();
		}

		// Create and use a ref-counted file
		{	using file = rc(new MockFile());
			file.write();

			// Pass to function
			processFile(file);

			// File should still be usable
			file.write();
		}

		// Verify operations
		assertEquals(writeCount, 3, "Write should be called three times");
		assertEquals(closeCount, 1, "File should be closed once at the end");
	}
);
