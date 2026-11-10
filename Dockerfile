# Hackathon road-graph (UDS) editor, based on iD.
#   docker build -t uds-editor .
#   docker run --rm -p 8080:80 uds-editor      ->  http://localhost:8080
#
# The presets (tag schema) and the community index are normally loaded from a public CDN.
# Here they are copied into the image, so the editor itself works without internet.
# (Only the background imagery tiles still need internet.)

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .

# the address under which the browser will open the editor; change it for a non-local deployment
ARG PUBLIC_URL=http://localhost:8080
ENV ID_PRESETS_CDN_URL=${PUBLIC_URL}/schema/ \
    ID_OCI_CDN_URL=${PUBLIC_URL}/oci/

RUN npm run all

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/index.html /app/land.html /usr/share/nginx/html/
COPY --from=build /app/dist /usr/share/nginx/html/dist
COPY --from=build /app/node_modules/@openstreetmap/id-tagging-schema/dist /usr/share/nginx/html/schema/dist
COPY --from=build /app/node_modules/osm-community-index/dist /usr/share/nginx/html/oci/dist
EXPOSE 80
