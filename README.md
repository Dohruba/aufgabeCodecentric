# API zur Suche nach codecentric-Entwicklern
Dieses Backend bietet eine API zum Auffinden von Entwicklern bei codecentric, die Erfahrung mit einer bestimmten Programmiersprache haben.

## API
Der Endpunkt zur Abrufung der Liste von Entwicklern lautet wie folgt:
- GET-Anfrage
- /members/p_language/:name
  - wobei `name` der Name der Programmiersprache ist

Um sicherzustellen, dass der richtige Name für die Programmiersprache für die Anfrage verwendet wird, können Sie die aktuelle Liste der Programmiersprachen in der Datenbank abrufen mit:
- GET-Anfrage
- /languages

### Testen der API
Die Datei "PostmanAPITests.json" kann in Postman importiert werden. Die Sammlung kann ausgeführt werden, um die API zu testen. **Um alle Tests korrekt laufen zu lassen, warten Sie bis es in der Log vom Backend "Database ready" steht.**

## Initialisierung des Containers
### .env Datei
Eine .env-Datei ist im Backend-Verzeichnis erforderlich. Sie sollte die Informationen für die PostgreSQL-Datenbank und das GitHub-Token für die GitHub API-Aufrufe enthalten. "template.env" kann als Grundlage dafür verwendet werden.

### Docker Befehle
Aus dem **Backend**-Verzeichnis heraus ausführen:
- docker build -t devs-backend-app .
- docker-compose up -d
