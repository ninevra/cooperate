import test from 'ava';
import {SharedContext, SemaphoreDownError} from '../source';
import synchronize from './_synchronize';

test('attempt to down() semaphore concurrently in different processes', async t => {
	const {context, release, theirs} = await synchronize({
		context: new SharedContext(t.title),
		ours: 'down-second',
		theirs: 'down-first'
	});

	const semaphore = context.createSemaphore(t.title, {initialValue: 2});
	// Wait for them
	await theirs.acquire();
	// They hold the resources; try to get them
	await t.throwsAsync(semaphore.downNow(), {instanceOf: SemaphoreDownError});
	const result = semaphore.down();
	// Signal them to release
	release();
	// Get the resources
	await t.notThrowsAsync(result);
});

test('semaphore is cleaned up when a test worker exits', async t => {
	const {context} = await synchronize({
		context: new SharedContext(t.title),
		ours: 'torn down',
		theirs: 'unused'
	});
	const semaphore = context.createSemaphore(t.title, {initialValue: 1});

	// Acquire the semaphore
	await semaphore.downNow();
	// Over-acquire the semaphore
	void semaphore.down();
	void semaphore.down();

	// Our lock will be released when we exit
	t.pass();
});
