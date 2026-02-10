## Packages
recharts | For drawing the trend line chart of silver prices
date-fns | For formatting timestamps in the chart and UI
framer-motion | For smooth animations and transitions

## Notes
The backend scrapes data every 5 minutes.
Frontend should poll `api/prices` periodically or rely on `refetchInterval` in React Query to keep the chart updated.
The primary display value is `priceInr`.
