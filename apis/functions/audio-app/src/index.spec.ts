import { handler, chunkMapList } from './index';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mock } from 'jest-mock-extended';

jest.mock('aws-sdk',() =>{
 const mockS3 = {
    putObject: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValueOnce({}),
 };
 return {
    S3: jest.fn(() => mockS3),
 }
});
describe('Audio App Functionality', () => {

    let mockEvent = mock<APIGatewayProxyEvent>();

    beforeEach(() => {
        mockEvent =  mock<APIGatewayProxyEvent>();
    });

    test.skip('should return 400 for missing userid or chunk', async () => {
        mockEvent.httpMethod = 'POST';
        mockEvent.resource = '/audio/add';
        mockEvent.body = JSON.stringify({ key: '123' });
        const result = await handler(mockEvent);
        expect(result.statusCode).toBe(400);
    });
    
    test.skip('should return 200 valid status for right userId and chunk', async() =>{
        mockEvent.httpMethod = 'POST';
        mockEvent.resource = '/audio/add';
        mockEvent.body = JSON.stringify({ key: '123', chunk: 'U29tZUJhc2U2NEVuY29kZWREYXRh' });
        
        const result = await handler(mockEvent);
        expect(result.statusCode).toBe(200);
    });

    test.skip('should return 200 valid status for multiple different requests', async() =>{
        mockEvent.httpMethod = 'POST';
        mockEvent.resource = '/audio/add';
        const requests = [
            { key: '123', chunk: 'U29tZUJhc2U2NEVuY29kZWREYXRh111111111111111' },
            { key: '124', chunk: 'U29tZUJhc2U2NEVuY29kZWREYXRh222222222222222' },
            { key: '125', chunk: 'U29tZUJhc2U2NEVuY29kZWREYXRh3333333333333333' }
        ];

        const results = await Promise.all(requests.map(async (body) => {
            mockEvent.body = JSON.stringify(body);
            return handler(mockEvent);
        }));

        results.forEach(result => {
            expect(result.statusCode).toBe(200);
        });
        const result = await handler(mockEvent);
        expect(chunkMapList.size).toBe(3);
        expect(result.statusCode).toBe(200);
    });

    test('should return 200 valid status for multiple requests from same userID', async() =>{
        mockEvent.httpMethod = 'POST';
        mockEvent.resource = '/audio/add';
        const requests = [
            { key: 'user123', chunk: 'U29tZUJhc2U2NEVuY29kZWREYXRh111111111111111' },
            { key: 'user123', chunk: 'U29tZUJhc2U2NEVuY29kZWREYXRh222222222222222' },
            { key: 'user123', chunk: 'U29tZUJhc2U2NEVuY29kZWREYXRh3333333333333333' }
        ];

        const results = await Promise.all(requests.map(async (body) => {
            mockEvent.body = JSON.stringify(body);
            return handler(mockEvent);
        }));

        results.forEach(result => {
            expect(result.statusCode).toBe(200);
        });
        const result = await handler(mockEvent);
        expect(chunkMapList.size).toBe(1);
        expect(result.statusCode).toBe(200);
    })
});