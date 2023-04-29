FROM node:18-alpine AS server
WORKDIR /app
COPY ./monitor/package* ./
RUN yarn install
COPY ./monitor .
EXPOSE 8081
CMD ["yarn", "start"]
