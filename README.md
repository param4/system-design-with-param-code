# System Design with Param: code

Working code from the [**System Design with Param**](https://www.youtube.com/@SystemDesignWithParam) YouTube channel.

Every topic is built the same way: **build it → break it → fix it.** We write a small working version, break it on purpose (load, a second server, a race), then fix it the way production systems do.

Theory, whiteboards and study notes live in the notes repo: [param4/system-design-with-param](https://github.com/param4/system-design-with-param).

## Topics

| # | Topic | Video | Notes | Code |
|---|---|---|---|---|
| 01 | Rate limiter | [▶ Part 1: design](https://www.youtube.com/watch?v=J5wziH5OAZM) | [study notes](https://github.com/param4/system-design-with-param/tree/main/01-rate-limiter) · [live simulators](https://param4.github.io/system-design-with-param/01-rate-limiter/interactive/study-guide.html) · [blog](https://systemdesignwithparam.hashnode.dev/rate-limiter-system-design) | 🚧 in progress (Part 2) |

## 01 · Rate limiter: what we're building

Node.js + Express + Redis, in the same order as the Part 1 video:

1. All 5 algorithms in memory: fixed window, sliding log, sliding counter, token bucket, leaky bucket
2. **Break it:** run 2 servers, and a user gets 2× their limit
3. Move the counters to Redis
4. **Break it again:** two servers read the same counter at once (race condition)
5. **Fix it:** atomic Redis Lua scripts
6. Fail open vs fail closed, and client retries with exponential backoff + jitter

## Layout

One folder per topic, each self-contained with its own `package.json`:

```
01-rate-limiter/    rate limiter (Part 2 of video 01)
```
