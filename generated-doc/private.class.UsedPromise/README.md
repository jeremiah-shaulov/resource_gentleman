# `class` UsedPromise\<T>

[Documentation Index](../README.md)

## This class has

- [constructor](#-constructorpromise-promiset)
- [destructor](#-symbolasyncdispose-promisevoid)
- 3 methods:
[then](#-thenyt-nneveronfulfilled-value-t--y--promiselikey--null-onrejected-reason-unknown--n--promiseliken--null-promisey--n),
[catch](#-catchnneveronrejected-reason-unknown--n--promiseliken--null-promiset--n),
[finally](#-finallyonfinally-voidfunction--null-promiset)


#### 🔧 `constructor`(promise: Promise\<T>)



#### 🔨 \[Symbol.asyncDispose](): Promise\<`void`>



#### ⚙ then\<Y=T, N=`never`>(onfulfilled?: ((value: T) => Y | PromiseLike\<Y>) | `null`, onrejected?: ((reason: `unknown`) => N | PromiseLike\<N>) | `null`): Promise\<Y | N>

> Attaches callbacks for the resolution and/or rejection of the Promise.
> 
> 🎚️ Parameter **onfulfilled**:
> 
> The callback to execute when the Promise is resolved.
> 
> 🎚️ Parameter **onrejected**:
> 
> The callback to execute when the Promise is rejected.
> 
> ✔️ Return value:
> 
> A Promise for the completion of which ever callback is executed.



#### ⚙ catch\<N=`never`>(onrejected?: ((reason: `unknown`) => N | PromiseLike\<N>) | `null`): Promise\<T | N>

> Attaches a callback for only the rejection of the Promise.
> 
> 🎚️ Parameter **onrejected**:
> 
> The callback to execute when the Promise is rejected.
> 
> ✔️ Return value:
> 
> A Promise for the completion of the callback.



#### ⚙ finally(onfinally?: VoidFunction | `null`): Promise\<T>

> Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
> resolved value cannot be modified from the callback.
> 
> 🎚️ Parameter **onfinally**:
> 
> The callback to execute when the Promise is settled (fulfilled or rejected).
> 
> ✔️ Return value:
> 
> A Promise for the completion of the callback.



