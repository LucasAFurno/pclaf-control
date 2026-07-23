FROM node:22-alpine AS production

RUN apk add --no-cache openssl \
  && addgroup -S fiscal \
  && adduser -S fiscal -G fiscal

WORKDIR /srv/fiscal
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src

ENV NODE_ENV=production
ENV FISCAL_HOST=0.0.0.0
ENV PORT=8080

USER fiscal
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.mjs"]
