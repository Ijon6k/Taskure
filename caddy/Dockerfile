FROM docker.io/caddy:2-alpine

# Bake the reverse proxy configuration directly into the image
# This allows running the full stack without needing any host repository files
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
