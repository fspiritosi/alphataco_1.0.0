FROM alpine:3.20
RUN apk add --no-cache curl tzdata
COPY crontab /etc/crontabs/root
CMD ["crond", "-f", "-l", "2"]
