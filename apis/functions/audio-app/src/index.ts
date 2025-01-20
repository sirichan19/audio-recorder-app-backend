import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const bucketName = process.env.BUCKET_NAME || 'audio-bucket-1234567890';
let chunkList: Buffer[] = [];
export let chunkMapList : Map<string, Buffer[]> = new Map();
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
console.log('event.httpMethod--->', event.httpMethod);

  switch (event.httpMethod) {
    case 'POST':
      return addAudioChunkOrMergeChunks(event);
    case 'GET':
      return retrieveAudioFromS3(event);
    case 'DELETE':
      return deleteAudioFromS3(event);
    default:
      return {
        statusCode: 400,
        body: JSON.stringify('Bad request.......'),
      };
  }
  
};

const addAudioChunkOrMergeChunks  = async(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if(event.resource.includes('add')){
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify('Invalid request, no audio found'),
    };
  }
  const {key,chunk} = JSON.parse(event.body);

  if (!chunk) {
    return {
      statusCode: 400,
      body: JSON.stringify('Invalid request, no audio found'),
    };
  }

  if(!chunkMapList.has(key)){
    chunkMapList.set(key, []);
  }

  chunkMapList.get(key)!.push(Buffer.from(chunk, 'base64'));
  console.log('chunkMapList--->', chunkMapList);

    const mergedChunk = Buffer.concat(chunkMapList.get(key) || []);
    const mergedKey = `/merged-audio-${key}/${Date.now()}-audio.mp3`;
    try {
      await s3.putObject({
        Bucket: bucketName,
        Key: mergedKey,
        Body: mergedChunk,
        ContentType: 'audio/mpeg'
      }).promise();

      return {
        statusCode: 200,
        body: JSON.stringify({
          key: mergedKey,
          message: 'Recording saved to S3 successfully',
          headers: {
            "Access-Control-Allow-Origin": "*",  // Or specify the exact domain, e.g., "https://yourfrontend.com"
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
            "Access-Control-Allow-Headers": "Content-Type"
          },
        })
      };
    } catch (err) {
      console.log(err);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Recording processing failed', error: err }),
      };
    }
  }
    if(chunkMapList.size > 0){
      return {
      statusCode: 200,
      body: JSON.stringify('Chunk stored temporarily in Lambda'),
      headers: {
        "Access-Control-Allow-Origin": "*",  // Or specify the exact domain, e.g., "https://yourfrontend.com"
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type"
      },
    };
  }


  if(event.resource.includes('merge')){
    const mergedChunk = Buffer.concat(chunkList);
    const mergedKey = `/merged-audio/${Date.now()}-audio.mp3`;
  try{
    await s3.putObject({
      Bucket: bucketName,
      Key: mergedKey,
      Body: mergedChunk,
      ContentType: 'audio/mpeg'
    }).promise();
  
    chunkList = []; // clear the stored chunks
    chunkMapList.clear(); // clear the stored chunks map
    return {
      statusCode: 200,
      body: JSON.stringify({
        key : mergedKey,
        message: 'Recording saved to S3 successfully',
        headers: {
          "Access-Control-Allow-Origin": "*",  // Or specify the exact domain, e.g., "https://yourfrontend.com"
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      })
    };
  }catch(err){
    console.log(err);
    return {
      statusCode: 500,
      body: JSON.stringify( {message : 'Recording processing failed', error : err }),
    };
  
  }
  
}
return {
  statusCode: 400,
  body: JSON.stringify('Invalid request'),
};
};

const retrieveAudioFromS3 = async(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> =>{
  const audioKey = event.queryStringParameters?.key ||  `/merged-audio/${Date.now()}-audio.mp3`;

  const signedURL = await getSignedUrl(event);

  console.log('signedURL--->', signedURL);
  
  try {
    const data = await s3.getObject({
      Bucket: bucketName,
      Key: audioKey,
    }).promise()

    return {
      statusCode: 200,
      body: JSON.stringify({
        key : audioKey,
        message: 'Recording retrieved successfully',
        audio: data.Body ? Buffer.from(data.Body as string).toString('base64') : ''
      }),
      headers: {
        'Content-Type': data.ContentType || 'audio/mpeg',
        'Content-Encoding': 'base64',
        "Access-Control-Allow-Origin": "*",  // Or specify the exact domain, e.g., "https://yourfrontend.com"
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
          "Access-Control-Allow-Headers": "Content-Type"
      },
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error retrieving audio from S3', error: err }),
    };
  }
};
const deleteAudioFromS3 = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>  => {
  const audioKey = event.queryStringParameters?.key || '/merged-audio/${Date.now()}-audio.mp3';

  try {
    await s3.deleteObject({
      Bucket: bucketName,
      Key: audioKey,
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify('Audio deleted successfully from S3'),
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error deleting audio from S3', error: err }),
    };
  }
};

const getSignedUrl = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const mergedKey = `/merged-audio/${Date.now()}-audio.mp3`;
  try{
  const signedURL =  await generatePreSignedUrl(bucketName, mergedKey, 1800);
  console.log('signedURL--->', signedURL);
  return {
    statusCode: 200,
    body: JSON.stringify({
      key: mergedKey,
      signedURL: signedURL,
      message: 'Signed URL generated successfully',
    }),
    headers: {
      "Access-Control-Allow-Origin": "*",  // Or specify the exact domain, e.g., "https://yourfrontend.com"
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
      "Access-Control-Allow-Headers": "Content-Type"
    },
  }
  }catch(err){
    console.log(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error getting signed URL', error: err }),
    };
  }


};
function generatePreSignedUrl(bucketName: string, key: string, expiresIn: number): string {
  const params = {
    Bucket: bucketName,
    Key: key,
    Expires: expiresIn
  };

  return s3.getSignedUrl('getObject', params);
};