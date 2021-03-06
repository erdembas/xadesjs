var select, xadesjs, DOMParser, XMLSerializer, readXml, assert;

if (typeof module !== "undefined") {
    var config = require("./config");
    select = config.select;
    xadesjs = config.xadesjs;
    DOMParser = config.DOMParser;
    XMLSerializer = config.XMLSerializer;
    assert = config.assert;
    readXml = config.readXml;
}

describe("RSA-PKCS1", function () {

    function CheckSignature(xmlString, key) {
        return new Promise(function (resolve, reject) {
            var xml = new DOMParser().parseFromString(xmlString, "application/xml");
            var signature = select(xml, "//*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']")[0];
            var sig = new xadesjs.SignedXml(xml);
            sig.LoadXml(signature);
            sig.CheckSignature(key)
                .then(resolve, reject);
        })
    }

    var rsaKeySHA1 = null;
    var rsaKeySHA256 = null;
    var rsaKeySHA384 = null;
    var rsaKeySHA512 = null;

    function generateRsaKey(hash) {
        var alg = {
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: 1024,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: { name: hash }
        };
        return xadesjs.Application.crypto.subtle.generateKey(
            alg,
            false,
            ["sign", "verify"]
        );
    }

    before(function (done) {
        generateRsaKey("SHA-1")
            .then(function (k) {
                rsaKeySHA1 = k;
                return generateRsaKey("SHA-256");
            })
            .then(function (k) {
                rsaKeySHA256 = k;
                return generateRsaKey("SHA-384");
            })
            .then(function (k) {
                rsaKeySHA384 = k;
                return generateRsaKey("SHA-512");
            })
            .then(function (k) {
                rsaKeySHA512 = k;
                return Promise.resolve();
            })
            .then(done, done);
    })

    function SignXml(xmlString, key, algorithm) {
        return new Promise(function (resolve, reject) {
            var xmlDoc = new DOMParser().parseFromString(xmlString, "application/xml");
            var signedXml = new xadesjs.SignedXml(xmlDoc);
            // Add the key to the SignedXml document.
            signedXml.SigningKey = key;
            // Create a reference to be signed.
            var reference = new xadesjs.Reference();
            reference.Uri = "";
            // Add an enveloped transformation to the reference.
            reference.AddTransform(new xadesjs.XmlDsigEnvelopedSignatureTransform());
            // Add the reference to the SignedXml object.
            signedXml.AddReference(reference);
            // Set prefix for Signature namespace
            signedXml.Prefix = "ds";

            // Compute the signature.
            signedXml.ComputeSignature(algorithm)
                .then(function () {
                    // Append signature
                    var xmlDigitalSignature = signedXml.GetXml();
                    xmlDoc.documentElement.appendChild(xmlDigitalSignature);

                    // Serialize XML document
                    var signedDocument = new XMLSerializer().serializeToString(xmlDoc);
                    return Promise.resolve(signedDocument);
                })
                .then(resolve, reject);
        })
    }

    function Test(key, keyName, done, length) {
        SignXml("<root><child1/><child2/><child3/></root>", key.privateKey, { name: "RSASSA-PKCS1-v1_5", saltLength: 12 })
            .then(function (xmlSig) {
                assert.equal(!!xmlSig, true, "Empty XML signature string for " + keyName);
                return CheckSignature(xmlSig, key.publicKey);
            })
            .then(function (v) {
                assert.equal(v, true, "Wrong signature verification for " + keyName);
                return Promise.resolve();
            })
            .then(done, done);
    }

    it("Sign/verify RSA-PKCS1 SHA1", function (done) {
        Test(rsaKeySHA1, "RSA-PKCS1-SHA1", done);
    })
    
    it("Sign/verify RSA-PKCS1 SHA256", function (done) {
        Test(rsaKeySHA256, "RSA-PKCS1-SHA256", done);
    })
    
    it("Sign/verify RSA-PKCS1 SHA384", function (done) {
        Test(rsaKeySHA384, "RSA-PKCS1-SHA384", done);
    })
    
    it("Sign/verify RSA-PKCS1 SHA512", function (done) {
        Test(rsaKeySHA512, "RSA-PKCS1-SHA512", done);
    })

})