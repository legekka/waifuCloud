##parancsok szintaktikája
pár példával a parancsok használata

##data_count
Visszatér az adatbázisban található postok számával.

call:
```json
{
    "name": "data_count",
    "job_id": "jobid"
}```
response:
```json
{
    "job_id": "jobid",
    "error": false,
    "response": 310
}```

##add_post
Hozzáad egy új postot az adatbázishoz.

call:
```json
{
    "name": "add_post",
    "post": szabályos post objektum,
    "job_id": "jobid"
}```
response:
```json
{
    "job_id": "jobid",
    "error": false,
    "response": "Succesfully added."
}```

##save
Elmenti az adatbázist.

call:
```json
{
    "name": "save",
    "job_id": "jobid"
}```
response:
```json
{
    "job_id": "jobid",
    "error": false,
    "response": "Database saved."
}```