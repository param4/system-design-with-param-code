-- Sliding window log, atomic.
-- KEYS[1] = log key (sorted set), ARGV[1] = limit, ARGV[2] = window (ms), ARGV[3] = unique request id
-- Returns {allowed (1/0), remaining, retry after (ms), reset after (ms)}
local time = redis.call('TIME')                                     -- one clock for all servers
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local limit, window = tonumber(ARGV[1]), tonumber(ARGV[2])

redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)            -- drop requests that left the window
local count = redis.call('ZCARD', KEYS[1])
local allowed = count < limit
if allowed then
  redis.call('ZADD', KEYS[1], now, ARGV[3])                         -- score = time, member = request id
  redis.call('PEXPIRE', KEYS[1], window)                            -- idle users disappear after one window
  count = count + 1
end

-- The window frees a slot when its oldest request drops out
local oldest = tonumber(redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')[2])
local resetMs = oldest + window - now

if allowed then
  return {1, limit - count, 0, resetMs}
end
return {0, 0, resetMs, resetMs}
