FROM alpine

EXPOSE 8080
WORKDIR /app
COPY . /app/

CMD [ "sh" ]
ENTRYPOINT [ "node", "webhook.js" ]

ENV PORT=8080

WORKDIR /app

RUN apk add --no-cache \
    rsync \
    git \
    openssh \
    curl \
    bash \
    nodejs \
    npm \
    ts
RUN ts -S 1;

# replace shell with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# install dependencies
RUN npm config set ignore-scripts false && npm install
