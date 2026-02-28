import modal

app = modal.App("my-first-app")

@app.function()
def hello():
    return "Hello from Modal!"
