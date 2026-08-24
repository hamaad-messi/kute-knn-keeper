# K-NN Predictor

from sklearn.datasets import load_iris

from sklearn.model_selection import train_test_split

from sklearn.neighbors import KNeighborsClassifier

from sklearn.metrics import accuracy_score

data = load_iris()

x = data.data

y = data.target

x_train, x_test, y_train, y_test = train_test_split(x, y, test_size = 0.2, random_state = 42)

k = 5

model = KNeighborsClassifier(n_neighbors = k)

model.fit(x_train, y_train)

print("--- K-NN MODEL TRAINED SUCCESSFULLY-----")

print(f"value of k used: {k}")

y_pred = model.predict(x_test)

print("\nActual Labels:", y_test)

print("Predicted Labels:", y_pred)

accuracy = accuracy_score(y_test, y_pred)

print(f"\nAccuracy: {accuracy * 100:.2f}%")

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kute-knn-keeper.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/17d63cf8-01b9-47b9-bd51-faa84edd326d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
