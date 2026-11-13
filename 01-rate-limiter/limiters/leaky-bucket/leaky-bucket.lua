-- Leaky bucket, atomic. One request leaves every interval, so each request books its turn to leave.
-- KEYS[1] = bucket key (when the last queued request leaves), ARGV[1] = capacity, ARGV[2] = leak interval (ms)
-- Returns {allowed (1/0), remaining, retry after (ms), reset after (ms), wait (ms)}
local time = redis.call('TIME')                                     -- one clock for all servers
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local capacity, interval = tonumber(ARGV[1]), tonumber(ARGV[2])
local last = tonumber(redis.call('GET', KEYS[1])) or now

-- Requests still waiting: the last one leaves at `last`, one interval after the one before it
local queued = math.max(0, math.ceil((last - now) / interval))

if queued >= capacity then
  -- Full: room frees up when the oldest waiting request leaves
  local oldest = last - (queued - 1) * interval
  return {0, 0, oldest - now, last - now, 0}
end

-- Join the back of the queue: leave one interval after the request in front (or after now, if empty)
local leave = math.max(now, last) + interval
redis.call('SET', KEYS[1], leave, 'PX', math.ceil(leave - now))    -- gone once the queue has drained
return {1, capacity - (queued + 1), 0, leave - now, leave - now}
