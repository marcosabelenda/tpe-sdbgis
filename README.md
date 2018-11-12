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

## Run the program

```
npm start
```
