-- Sliding window counter, atomic.
-- KEYS[1] = counters key (hash: window, previous, current), ARGV[1] = limit, ARGV[2] = window (ms)
-- Returns {allowed (1/0), remaining, retry after (ms), reset after (ms)}
local time = redis.call('TIME')                                     -- one clock for all servers
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local limit, window = tonumber(ARGV[1]), tonumber(ARGV[2])
local windowStart = now - now % window

local saved = redis.call('HMGET', KEYS[1], 'window', 'previous', 'current')
local savedStart = tonumber(saved[1]) or windowStart
local previous = tonumber(saved[2]) or 0
local current = tonumber(saved[3]) or 0

-- New window: the current count becomes the previous one (or 0 if a window was skipped)
if savedStart ~= windowStart then
  if savedStart == windowStart - window then previous = current else previous = 0 end
  current = 0
end

-- Weight the previous window by how much of it is still inside the sliding window
local elapsed = (now - windowStart) / window
local estimate = previous * (1 - elapsed) + current
local resetMs = windowStart + window - now

if estimate + 1 > limit then
  -- Retry when enough of the previous window has slid out to fit one more request
  local retryMs = resetMs
  local room = limit - 1 - current
  if room >= 0 and previous > 0 then
    retryMs = math.ceil((1 - room / previous - elapsed) * window)
  end
  return {0, 0, retryMs, resetMs}
end

current = current + 1
redis.call('HSET', KEYS[1], 'window', windowStart, 'previous', previous, 'current', current)
redis.call('PEXPIRE', KEYS[1], window * 2)                          -- this window still counts during the next one
return {1, math.floor(limit - (estimate + 1)), 0, resetMs}
