# LifeStream REST API

## How to use this document

### Parameter types

This document mentions 3 different kinds of parameters.
- **Path component**: These parameters are part of the URL. For example, in _GET_ `api/image/:imageid`, `:imageid` is a path component specifying the numeric ID of the requested image.
- **Query string**: This is how parameters are passed when making _GET_ and _DELETE_ requests. These parameters are appended to the end of the URL. For example, in _GET_ `api/image/15?scaleTo=192&scaleMode=cover`, `scaleTo` and `scaleMode` are query string parameters.
- **Request body**: This is how parameters are passed when making _POST_ and _PUT_ requests. These parameters are received by the server as though they were fields included with a form submission.


## Image

### POST api/image

Uploads an image file to the server and associates it with one or more streams. Optionally, a descriptive comment may also be associated with the image.

#### Parameters

- Request body:
	- **image**: Image file as _multipart/form-data_
	- **streamid**: Stream ID
	- **comment** _(optional)_: Comment text

#### Result

If successful, the following response is sent:
```javascript
{
	"success": true,
	"id": /* (number) ID of uploaded image */
}
```

If the file already existed in the server's uploads directory, no changes are made to the server. The following repsonse is sent:
```javascript
{
	"success": true
}
```

If unsuccessful, the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

### GET /api/image/:imageid

Downloads an image from the server. Optionally, a scaled-down version of the image may be requested.

#### Parameters

- Path component:
	- **imageid**: Image ID
- Query string:
	- **scaleTo** _(optional)_: Number of pixels. If the image is taller or wider than the specified number of pixels, it is scaled down before being sent to the client. This behavious is affected by `scaleMode`
	- **scaleMode** _(optional)_: _cover_ or _contain_
		- **cover**: The size specified by `scaleTo` applies to the smaller dimension of the image. For example, if an image is originally 640x480 pixels, and `scaleTo` is 192, then the image would be scaled to 256x192 pixels
		- **contain**: The size specified by `scaleTo` applies to the larger dimensionof the image. For example, if an image is 640x480 pixels, and `scaleTo` is 192, then the image would be scaled to 192x144 pixels
		- If not specified, or if an invalid value is specified, the default behaviour is _contain_.

#### Permissions

The user who uploaded an image can always view their own image.

Anyone can view images that are associated with at least one _Public_ stream.

Users subscribed to at least one stream associated with a given image can view that image.

#### Result

If successful, the requested image is sent to the client.

If unsuccessful, the following response is sent:
```javascript
{
	"success": false,
	"error": /* (string) Error message */
}
```

### Set image comment

### Get list of streams containing image

### Associate image with stream

### Disassociate image from stream

## Invite

## Stream

## Subscription

## User
