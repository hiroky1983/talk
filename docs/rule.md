```set
```js
const fullStars = Math.floor(prop("rating")); 
let result = '';     
for (let i = 0; i < 5; i++) {         
	result += i < fullStars ? '★' : '☆';     
}   
return result;
```
```

