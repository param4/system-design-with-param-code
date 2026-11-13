-- Fixed window, atomic.
-- KEYS[1] = counter key, ARGV[1] = limit, ARGV[2] = window (ms)
-- Returns {allowed (1/0), remaining, retry after (ms), reset after (ms)}
local time = redis.call('TIME')                                     -- one clock for all servers
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local limit, window = tonumber(ARGV[1]), tonumber(ARGV[2])
local resetMs = window - now % window                               -- time left in this window

-- First request of the window creates the counter with its expiry in one command,
-- so no crash can leave a key without a TTL. The key expires exactly at the window's end.
redis.call('SET', KEYS[1], 0, 'PX', resetMs, 'NX')

local count = tonumber(redis.call('GET', KEYS[1]))
if count >= limit then
  return {0, 0, resetMs, resetMs}
end

count = redis.call('INCR', KEYS[1])                                 -- INCR keeps the expiry
return {1, limit - count, 0, resetMs}
