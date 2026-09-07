import tensorflow as tf
import keras
from keras import layers
from keras.applications import MobileNetV2
from keras.applications.mobilenet_v2 import preprocess_input

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
TRAIN_DIR = "dataset/FaceShape Dataset/training_set"
VAL_DIR = "dataset/FaceShape Dataset/testing_set"

train_ds = keras.utils.image_dataset_from_directory(
    TRAIN_DIR, image_size=IMG_SIZE, batch_size=BATCH_SIZE, label_mode="int"
)
val_ds = keras.utils.image_dataset_from_directory(
    VAL_DIR, image_size=IMG_SIZE, batch_size=BATCH_SIZE, label_mode="int"
)

class_names = train_ds.class_names
print("Class order:", class_names)

augment = keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.05),
    layers.RandomZoom(0.1),
])

def prep_train(x, y):
    x = augment(x)
    return preprocess_input(x), y

def prep_val(x, y):
    return preprocess_input(x), y

train_ds = train_ds.map(prep_train).prefetch(tf.data.AUTOTUNE)
val_ds = val_ds.map(prep_val).prefetch(tf.data.AUTOTUNE)

base = MobileNetV2(input_shape=IMG_SIZE + (3,), include_top=False, weights="imagenet")
base.trainable = False

inputs = keras.Input(shape=IMG_SIZE + (3,))
x = base(inputs, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.3)(x)
x = layers.Dense(128, activation="relu")(x)
outputs = layers.Dense(len(class_names), activation="softmax")(x)
model = keras.Model(inputs, outputs)

model.compile(optimizer=keras.optimizers.Adam(1e-3),
              loss="sparse_categorical_crossentropy",
              metrics=["accuracy"])

print("=== Phase 1: frozen backbone ===")
model.fit(train_ds, validation_data=val_ds, epochs=6)

print("=== Phase 2: fine-tune top of backbone ===")
base.trainable = True
for layer in base.layers[:-30]:
    layer.trainable = False

model.compile(optimizer=keras.optimizers.Adam(1e-5),
              loss="sparse_categorical_crossentropy",
              metrics=["accuracy"])
model.fit(train_ds, validation_data=val_ds, epochs=4)

loss, acc = model.evaluate(val_ds)
print(f"Final validation accuracy: {acc:.4f}")

model.save("model/hairstyle_model_v2.h5")
with open("model/hairstyle_model_v2_classes.txt", "w") as f:
    f.write("\n".join(class_names))
print("Saved model/hairstyle_model_v2.h5")
print("Class order saved to model/hairstyle_model_v2_classes.txt")
