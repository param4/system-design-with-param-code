-- Token bucket, atomic. KEYS[1] = bucket key, ARGV[1] = capacity, ARGV[2] = refill rate (tokens/sec)
-- Returns {allowed (1/0), remaining, retry after (ms), reset after (ms)}
local t = redis.call('TIME')                              -- one clock for all servers
local now = tonumber(t[1]) + tonumber(t[2]) / 1e6
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local cap, rate = tonumber(ARGV[1]), tonumber(ARGV[2])
local tokens = tonumber(b[1]) or cap
local ts = tonumber(b[2]) or now
tokens = math.min(cap, tokens + (now - ts) * rate)        -- lazy refill
local allowed = tokens >= 1
if allowed then tokens = tokens - 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', KEYS[1], math.ceil(cap / rate) * 2)  -- clean up idle users

-- Full again after (cap - tokens) / rate seconds; the next token after (1 - tokens) / rate
local resetMs = math.ceil((cap - tokens) / rate * 1000)
if allowed then
  return {1, math.floor(tokens), 0, resetMs}
end
return {0, 0, math.ceil((1 - tokens) / rate * 1000), resetMs}
