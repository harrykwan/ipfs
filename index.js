require("dotenv").config();
const pinataApiKey = process.env.pinata_apikey;
const pinataSecretApiKey = process.env.pinata_apisecret;
const pinataSDK = require("@pinata/sdk");
const pinata = pinataSDK(pinataApiKey, pinataSecretApiKey);
const fs = require("fs");
const request = require("request");
const FormData = require("form-data");
const path = require("path");
const fileUpload = require("express-fileupload");
const express = require("express");
const morgan = require("morgan");
const _ = require("lodash");
const port = 80;
// const busboy = require("connect-busboy");
const bodyParser = require("body-parser");
const app = express();
// app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
// app.use(busboy());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "./tmp/",
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));

const pinFileToIPFS = (filepath, pinataname, pinatametadata, callback) => {
  const readableStreamForFile = fs.createReadStream(filepath);
  const options = {
    pinataMetadata: {
      name: pinataname ? pinataname : "",
      keyvalues: pinatametadata ? pinatametadata : {},
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };
  pinata
    .pinFileToIPFS(readableStreamForFile, options)
    .then((result) => {
      //handle results here
      console.log(result);
      if (callback) {
        callback(result);
      }
      fs.unlink(filepath, (err) => {
        if (err) {
          console.error(err);
          return;
        }
        //file removed
      });
    })
    .catch((err) => {
      //handle error here
      console.log(err);
    });
};

const pinJSONToIPFS = (metadata, pinataname, pinatametadata, callback) => {
  const body = metadata;
  const options = {
    pinataMetadata: {
      name: pinataname ? pinataname : "",
      keyvalues: pinatametadata ? pinatametadata : {},
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };
  pinata
    .pinJSONToIPFS(body, options)
    .then((result) => {
      //handle results here
      console.log(result);
      if (callback) {
        callback(result);
      }
    })
    .catch((err) => {
      //handle error here
      console.log(err);
    });
};

async function mint(body) {
  // 172.26.4.74
  // 3.38.208.52
  const myPromise = new Promise((resolve, reject) => {
    var options = {
      method: "POST",
      url: "http://3.38.208.52/mint",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    };
    request(options, function (error, response) {
      if (error) throw new Error(error);
      console.log(response.body);
      resolve(JSON.parse(response.body));
    });
  });
  return myPromise;
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  // res.send("hi");
  res.sendFile("public/index.html", { root: __dirname });
});

app.get("/mint", (req, res) => {
  // res.send("hi");
  res.sendFile("public/mint.html", { root: __dirname });
});

app.get("/success", (req, res) => {
  // res.send("hi");
  res.sendFile("public/success.html", { root: __dirname });
});

app.post("/mint", async (req, res) => {
  // owner: "0x3E1D44802321cce6E9E7557730433c2ab5838760",
  // metadatauri: "QmZwEo7PGHsJrfLzbCb5dm6kxBBkBJjXDWa74C1FDLTGuM",
  // name: "harrykwantesting1",
  const mintdata = {
    owner: req.body.owner,
    metadatauri: req.body.metadatauri,
    name: req.body.name,
  };
  const result = await mint(mintdata);
  res.redirect("/success?address=" + result.address);
  // res.send(result);
});

app.post("/uploadfiletoipfs", (req, res) => {
  pinFileToIPFS(
    req.files.file.tempFilePath,
    req.body.pinataname,
    {},
    function (result) {
      res.send(result);
    }
  );
});

app.post("/uploadmetadatatoipfs", (req, res) => {
  const metadata = {
    name: req.body.name,
    description: req.body.description,
    image: req.body.image,
  };
  pinJSONToIPFS(metadata, req.body.pinataname, {}, function (result) {
    res.send(result);
  });
});

app.post("/ipfs", (req, res) => {
  pinFileToIPFS(
    req.files.file.tempFilePath,
    req.body.name + "_file",
    {},
    function (result_image) {
      console.log(result_image);
      const metadata = {
        name: req.body.name,
        description: req.body.description,
        image: "https://ipfs.io/ipfs/" + result_image.IpfsHash,
      };
      pinJSONToIPFS(
        metadata,
        req.body.name + "_metadata",
        {},
        function (result_metadata) {
          const ipfshash = result_metadata.IpfsHash;
          // res.send(ipfshash);
          res.redirect("/mint?ipfshash=" + ipfshash);
        }
      );
    }
  );
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
