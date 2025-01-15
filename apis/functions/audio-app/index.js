"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
var AWS = require("aws-sdk");
var s3 = new AWS.S3();
var bucketName = process.env.BUCKET_NAME || 'audio-bucket-1234567890';
//const MAX_CHUNKS = 5;
var chunkStore = [];
var handler = function (event, context) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        console.log('event.httpMethod--->', event.httpMethod);
        switch (event.httpMethod) {
            case 'POST':
                return [2 /*return*/, addAudioChunkOrMergeChunks(event)];
            case 'GET':
                return [2 /*return*/, retrieveAudioFromS3(event)];
            case 'DELETE':
                return [2 /*return*/, deleteAudioFromS3(event)];
            default:
                return [2 /*return*/, {
                        statusCode: 400,
                        body: JSON.stringify('Bad request.......'),
                    }];
        }
        return [2 /*return*/];
    });
}); };
exports.handler = handler;
var addAudioChunkOrMergeChunks = function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var chunk, mergedChunk, mergedKey, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (event.resource.includes('add')) {
                    if (!event.body) {
                        return [2 /*return*/, {
                                statusCode: 400,
                                body: JSON.stringify('Invalid request, no audio found'),
                            }];
                    }
                    chunk = JSON.parse(event.body).chunk;
                    chunkStore.push(Buffer.from(chunk, 'base64'));
                    if (chunkStore.length > 0) {
                        return [2 /*return*/, {
                                statusCode: 200,
                                body: JSON.stringify('Chunk stored temporarily in Lambda'),
                                headers: {
                                    "Access-Control-Allow-Origin": "*", // Or specify the exact domain, e.g., "https://yourfrontend.com"
                                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
                                    "Access-Control-Allow-Headers": "Content-Type"
                                },
                            }];
                    }
                }
                if (!event.resource.includes('merge')) return [3 /*break*/, 4];
                mergedChunk = Buffer.concat(chunkStore);
                mergedKey = "/merged-audio/".concat(Date.now(), "-audio.mp3");
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, s3.putObject({
                        Bucket: bucketName,
                        Key: mergedKey,
                        Body: mergedChunk,
                        ContentType: 'audio/mpeg'
                    }).promise()];
            case 2:
                _a.sent();
                chunkStore = []; // clear the stored chunks
                return [2 /*return*/, {
                        statusCode: 200,
                        body: JSON.stringify({
                            key: mergedKey,
                            message: 'Recording saved to S3 successfully',
                            headers: {
                                "Access-Control-Allow-Origin": "*", // Or specify the exact domain, e.g., "https://yourfrontend.com"
                                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
                                "Access-Control-Allow-Headers": "Content-Type"
                            },
                        })
                    }];
            case 3:
                err_1 = _a.sent();
                console.log(err_1);
                return [2 /*return*/, {
                        statusCode: 500,
                        body: JSON.stringify({ message: 'Recording processing failed', error: err_1 }),
                    }];
            case 4: return [2 /*return*/, {
                    statusCode: 400,
                    body: JSON.stringify('Invalid request'),
                }];
        }
    });
}); };
var retrieveAudioFromS3 = function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var audioKey, data, err_2;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                audioKey = ((_a = event.queryStringParameters) === null || _a === void 0 ? void 0 : _a.key) || "/merged-audio/".concat(Date.now(), "-audio.mp3");
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, s3.getObject({
                        Bucket: bucketName,
                        Key: audioKey,
                    }).promise()];
            case 2:
                data = _b.sent();
                return [2 /*return*/, {
                        statusCode: 200,
                        body: JSON.stringify({
                            key: audioKey,
                            message: 'Recording retrieved successfully',
                            audio: data.Body ? Buffer.from(data.Body).toString('base64') : ''
                        }),
                        headers: {
                            'Content-Type': data.ContentType || 'audio/mpeg',
                            'Content-Encoding': 'base64',
                            "Access-Control-Allow-Origin": "*", // Or specify the exact domain, e.g., "https://yourfrontend.com"
                            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
                            "Access-Control-Allow-Headers": "Content-Type"
                        },
                    }];
            case 3:
                err_2 = _b.sent();
                console.log(err_2);
                return [2 /*return*/, {
                        statusCode: 500,
                        body: JSON.stringify({ message: 'Error retrieving audio from S3', error: err_2 }),
                    }];
            case 4: return [2 /*return*/];
        }
    });
}); };
var deleteAudioFromS3 = function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var audioKey, err_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                audioKey = ((_a = event.queryStringParameters) === null || _a === void 0 ? void 0 : _a.key) || '/merged-audio/${Date.now()}-audio.mp3';
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, s3.deleteObject({
                        Bucket: bucketName,
                        Key: audioKey,
                    }).promise()];
            case 2:
                _b.sent();
                return [2 /*return*/, {
                        statusCode: 200,
                        body: JSON.stringify('Audio deleted successfully from S3'),
                    }];
            case 3:
                err_3 = _b.sent();
                console.log(err_3);
                return [2 /*return*/, {
                        statusCode: 500,
                        body: JSON.stringify({ message: 'Error deleting audio from S3', error: err_3 }),
                    }];
            case 4: return [2 /*return*/];
        }
    });
}); };
