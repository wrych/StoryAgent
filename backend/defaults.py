# Default values for the application

DEFAULT_LISTS = {
    "genres": [
        "Action",
        "Adventure",
        "Comedy",
        "Crime",
        "Drama",
        "Fantasy",
        "Historical",
        "Horror",
        "Mystery",
        "Romance",
        "Sci-Fi",
        "Thriller",
        "Western"
    ],
    "tones": [
        "Dark",
        "Lighthearted",
        "Serious",
        "Humorous",
        "Optimistic",
        "Pessimistic",
        "Suspenseful",
        "Romantic"
    ]
}

DEFAULT_SETTINGS = {
    "llm_url": "http://localhost:1234/v1/chat/completions",
    "llm_system_prompt": "You are a creative writing assistant. Use the provided story bible context to help write engaging and consistent chapters."
}
