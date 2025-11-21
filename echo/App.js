import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableWithoutFeedback,
} from "react-native";
import { Accelerometer } from "expo-sensors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const SHAPE_SIZE = 50;
const COLLECTOR_SIZE = 80;
const COLLECTOR_Y = screenHeight - COLLECTOR_SIZE - 40;

const FALL_SPEED = 8
const ACCEL_SENSITIVITY = 55; 
const SPAWN_INTERVAL = 1000;
const SWITCH_INTERVAL = 4500;

const SHAPES = {
  cube: { shadow: "square", color: "#ff9ef6" },
  sphere: { shadow: "circle", color: "#ffe27a" },
};

const TYPES = ["cube", "sphere"];
const COLLECTOR_TYPES = ["square", "circle"];

function isColliding(ax, ay, asize, bx, by, bsize) {
  return (
    ax < bx + bsize &&
    ax + asize > bx &&
    ay < by + bsize &&
    ay + asize > by
  );
}

export default function App() {
  const [collectorX, setCollectorX] = useState(
    (screenWidth - COLLECTOR_SIZE) / 2
  );
  const [collectorShape, setCollectorShape] = useState("square");
  const [falling, setFalling] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const restart = () => {
    setCollectorX((screenWidth - COLLECTOR_SIZE) / 2);
    setFalling([]);
    setScore(0);
    setCollectorShape("square");
    setGameOver(false);
  };

  useEffect(() => {
    if (gameOver) return;
    Accelerometer.setUpdateInterval(50);

    const sub = Accelerometer.addListener(({ x }) => {
      const move = x * ACCEL_SENSITIVITY;
      setCollectorX((old) => {
        let next = old + move;
        if (next < 0) next = 0;
        if (next > screenWidth - COLLECTOR_SIZE)
          next = screenWidth - COLLECTOR_SIZE;
        return next;
      });
    });

    return () => sub.remove();
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      const gap = screenWidth / 2;
      const leftX = Math.random() * (gap - SHAPE_SIZE);
      const rightX = gap + Math.random() * (screenWidth - gap - SHAPE_SIZE);
      
      const isCubeLeft = Math.random() < 0.5;

      const newShapes = [
        {
          id: Date.now(),
          type: isCubeLeft ? 'cube' : 'sphere',
          x: leftX,
          y: -SHAPE_SIZE,
          color: SHAPES[isCubeLeft ? 'cube' : 'sphere'].color,
        },
        {
          id: Date.now() + 1,
          type: isCubeLeft ? 'sphere' : 'cube',
          x: rightX,
          y: -SHAPE_SIZE,
          color: SHAPES[isCubeLeft ? 'sphere' : 'cube'].color,
        },
      ];

      setFalling((prev) => [...prev, ...newShapes]);

    }, SPAWN_INTERVAL);

    return () => clearInterval(interval);
  }, [gameOver]);


  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setCollectorShape((old) => {
        const i = COLLECTOR_TYPES.indexOf(old);
        return COLLECTOR_TYPES[(i + 1) % COLLECTOR_TYPES.length];
      });
    }, SWITCH_INTERVAL);

    return () => clearInterval(interval);
  }, [gameOver]);

  
  useEffect(() => {
    if (gameOver) return;

    const loop = setInterval(() => {
      const collectorBox = { x: collectorX, y: COLLECTOR_Y };

      const updated = falling
        .filter((obj) => {
          const nextY = obj.y + FALL_SPEED;

          const hit = isColliding(
            collectorBox.x,
            collectorBox.y,
            COLLECTOR_SIZE,
            obj.x,
            nextY,
            SHAPE_SIZE
          );

          if (hit) {
            const correct = SHAPES[obj.type].shadow === collectorShape;

            if (correct) {
              setScore((v) => v + 100);
              return false;
            } else {
              setGameOver(true);
              return false;
            }
          }

      
          if (nextY > screenHeight) {
            setScore((v) => Math.max(0, v - 50)); 
            return false;
          }
          return true;
        })
        .map((obj) => ({ ...obj, y: obj.y + FALL_SPEED }));

      setFalling(updated);
    }, 25);

    return () => clearInterval(loop);
  }, [falling, collectorX, collectorShape, gameOver]);

  const Collector = () => {
    const style = {
      position: "absolute",
      bottom: screenHeight - COLLECTOR_Y - COLLECTOR_SIZE,
      width: COLLECTOR_SIZE,
      height: COLLECTOR_SIZE,
      left: collectorX,
      backgroundColor: "#ffffff22",
      borderColor: "#9d91ff",
      borderWidth: 4,
    };

    if (collectorShape === "circle") {
      return <View style={[style, { borderRadius: COLLECTOR_SIZE / 2 }]} />;
    }
    return <View style={[style, { borderRadius: 12 }]} />;
  };

  return (
    <TouchableWithoutFeedback onPress={gameOver ? restart : undefined}>
      <View style={styles.container}>
        <StatusBar hidden />

        {falling.map((obj) => (
          <View
            key={obj.id}
            style={[
              styles.obj,
              {
                top: obj.y,
                left: obj.x,
                backgroundColor: obj.color,
                borderRadius: obj.type === "sphere" ? SHAPE_SIZE / 2 : 10,
                transform: [{ rotateZ: `${obj.y / 5}deg` }], 
              },
            ]}
          />
        ))}

        <Collector />

        <Text style={styles.score}>Score: {score}</Text>
        <Text style={styles.mode}>Shape: {collectorShape.toUpperCase()}</Text>

        {gameOver && (
          <View style={styles.over}>
            <Text style={styles.title}>MISMATCH!</Text>
            <Text style={styles.final}>Final Score: {score}</Text>
            <Text style={styles.tap}>Tap to restart</Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#312626ff",
  },
  obj: {
    position: "absolute",
    width: SHAPE_SIZE,
    height: SHAPE_SIZE,
    shadowColor: "#fff",
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  score: {
    position: "absolute",
    top: 50,
    left: 20,
    color: "#ededed",
    fontSize: 22,
    fontWeight: "bold",
  },
  mode: {
    position: "absolute",
    top: 50,
    right: 20,
    color: "#c7f764",
    fontSize: 18,
    fontWeight: "bold",
  },
  over: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(52, 51, 51, 0.39)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#e28181ff",
    fontSize: 38,
    fontWeight: "bold",
    marginBottom: 10,
  },
  final: {
    color: "#fff",
    fontSize: 22,
    marginBottom: 30,
  },
  tap: {
    color: "#aaa",
    fontSize: 16,
  },
});