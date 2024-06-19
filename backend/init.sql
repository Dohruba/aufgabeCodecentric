-- init.sql

CREATE TABLE developers (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    reposlink VARCHAR(255) NOT NULL,
    githublink VARCHAR(255) NOT NULL
);

CREATE TABLE repositories (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    developer VARCHAR(100) NOT NULL,
    languages_link VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL
);

CREATE TABLE programminglanguages (
    id SERIAL PRIMARY KEY,
    language VARCHAR(50) NOT NULL,
    developers VARCHAR(255)[] DEFAULT '{}'
);