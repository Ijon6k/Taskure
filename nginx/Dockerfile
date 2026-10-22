FROM nginx:1.26-alpine
COPY default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --spider -q http://127.0.0.1/health || exit 1
