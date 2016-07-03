# LifeStream REST API

## Image

### POST api/image

Uploads an image file to the server and associates it with one or more streams. Optionally, a descriptive comment may also be associated with the image.

#### Parameters

- **image**: image file as _multipart/form-data_
- **streamid**: stream ID
- **comment** _(optional)_: Comment text

#### Result

- If successful, the following response is sent:
```javascript
{
	"success": true,
	"id": // (number) ID of uploaded image
}
```
- If the file already existed in the server's uploads directory, no changes are made to the server. The following repsonse is sent:
```javascript
{
	"success": true
}
```
- If unsuccessful,
```javascript
{
	"success": false,
	"error": // (string) Error message
}
```

### Download image

### Set image comment

### Get list of streams containing image

### Associate image with stream

### Disassociate image from stream

## Invite

## Stream

## Subscription

## User
