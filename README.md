# tpe-sdbgis

## Requirements
- MongoDB


## Installation

Install dependencies:

```
npm install
```

Generate a spatial index using mongo cli:
```
$ mongo tpgeodb

db.messages.createIndex( { geometry : "2dsphere" } )
```

## Configure postgres
```
CREATE DATABASE sdbgis;
CREATE EXTENSION postgis;

CREATE TABLE tweets (
  id serial primary key,
  geometry  geometry(Point,4326) ,
  username  varchar(100),
  message   varchar(300),
  range     int
);

```

Insertion to DB is of type:

```
INSERT INTO tweets(geometry, username, message, range) VALUES (st_SetSrid(st_MakePoint(-58.491008, -34.5008638), 4326), 'test', 'tweet de prueba', 3000);
```

## Run the program

```
npm start
```
