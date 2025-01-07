import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const bucketName = process.env.BUCKET_NAME || 'audio-bucket-1234567890';
//const MAX_CHUNKS = 5;
let chunkStore: Buffer[] = [];

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {

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
        body: JSON.stringify('Bad request'),
      };
  }
  
};

const addAudioChunkOrMergeChunks  = async(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if(event.resource.includes('/add')){
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify('Invalid request, no audio found'),
    };
  }
  const {chunk} = JSON.parse(event.body);

  chunkStore.push(Buffer.from(chunk, 'base64'));

  if(chunkStore.length > 0){
    return {
      statusCode: 200,
      body: JSON.stringify('Chunk stored temporarily in Lambda'),
    };
  }
}

  if(event.resource.includes('/merge')){
    const mergedChunk = Buffer.concat(chunkStore);

  try{
    await s3.putObject({
      Bucket: bucketName,
      Key: `/merged-audio/${Date.now()}-audio.mp3`,
      Body: mergedChunk,
      ContentType: 'audio/mpeg'
    }).promise();
  
    chunkStore = []; // clear the stored chunks
    return {
      statusCode: 200,
      body: JSON.stringify('Recording saved to S3 successfully'),
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
  const audioKey = event.queryStringParameters?.key || '/merged-audio/${Date.now()}-audio.mp3';

  try {
    const data = await s3.getObject({
      Bucket: bucketName,
      Key: audioKey,
    }).promise()

    return {
      statusCode: 200,
      body: data.Body?.toString('base64') || '',
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Encoding': 'base64',
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