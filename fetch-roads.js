const data = require('./verkehrsstaerke.json');
const fs = require('fs');

const overpass = require('query-overpass');

const queryOverpass = (query) => {
  return new Promise((resolve, reject) => {
    overpass(query, (error, response) => {
      if (error) {
        return reject(error);
      } else if (response.features.length < 1) {
        return reject({ statusCode: 404, message: 'No roads found' });
      } else {
        return resolve(response.features);
      }
    });
  });
};

const fetchRoadByPoint = async (lat, lon) => {
  const maxDist = 10;

  const query = `[out:json];
      way
      (around:${maxDist},${lat},${lon})
      ["highway"];
    (
      ._;
      >;
    );
    out;`;

  return (await queryOverpass(query))[0];
};

const fetchRoadsByName = async (name) => {
  const query = `[out:json];
  ( node[name="${name}"](53.412641,9.667987,53.750171,10.290088);
  way[name="${name}"](53.412641,9.667987,53.750171,10.290088);
  rel[name="${name}"](53.412641,9.667987,53.750171,10.290088); );
  (
    ._;
    >;
  );
  out;`;

  return await queryOverpass(query);
};

const fetchRoads = async () => {
  const result = { type: 'FeatureCollection', features: [] };
  const features = data.features;
  for (let i = 0; i < features.length; i++) {
    try {
      const road = await fetchRoadByPoint(
        features[i].geometry.coordinates[1],
        features[i].geometry.coordinates[0]
      );

      const allRoadSegments = await fetchRoadsByName(road.properties.tags.name);

      result.features = [
        ...result.features,
        ...allRoadSegments
          .filter((road) => road.geometry.type == 'LineString')
          .map((road) => {
            return {
              ...road,
              properties: { ...features[i].properties, ...road.properties }
            };
          })
      ];
      console.log(i + 1 + '/' + features.length);
    } catch (e) {
      console.error(e);
    }
  }

  return result;
};

fetchRoads().then((result) => {
  fs.writeFile('roads.geojson', JSON.stringify(result), (err) => {
    if (err) throw err;
  });
});
