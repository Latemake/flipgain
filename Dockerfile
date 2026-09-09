FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY src/valuation.js ./src/valuation.js
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8787
CMD ["node", "server/index.js"]
