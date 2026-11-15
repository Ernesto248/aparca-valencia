FROM python:3.12-slim-bookworm

ARG NOMINATIM_VERSION=5.3.3
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl libicu-dev libpq-dev osm2pgsql osmium-tool pkg-config postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir \
       "nominatim-db==${NOMINATIM_VERSION}" \
       "nominatim-api==${NOMINATIM_VERSION}" \
       "falcon==4.2.0" "gunicorn==25.1.0"

RUN useradd --system --create-home --home-dir /srv/nominatim nominatim \
    && mkdir -p /srv/nominatim-project /data \
    && chown -R nominatim:nominatim /srv/nominatim-project /data
COPY entrypoint.sh /usr/local/bin/nominatim-entrypoint
RUN chmod +x /usr/local/bin/nominatim-entrypoint
USER nominatim
WORKDIR /srv/nominatim-project
EXPOSE 8080
ENTRYPOINT ["nominatim-entrypoint"]
