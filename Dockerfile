FROM node:14-alpine

EXPOSE 8080
WORKDIR /app
COPY . /app/

CMD [ "sh" ]
ENTRYPOINT [ "node", "webhook.js" ]

ENV PORT=8080

RUN apk add --no-cache rsync git openssh vim && \
    npm config set ignore-scripts false && \
    npm install
