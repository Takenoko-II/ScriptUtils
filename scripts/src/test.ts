import { VectorXZ, world } from "@minecraft/server";
import { Random, Xorshift32 } from "./util/Random";
import { MinecraftDimensionTypes } from "./libs/@minecraft/vanilla-data/lib";
import { AbstractEventEmitter, EventHandlerRegistries, EventHandlerRegistry } from "./util/EventEmitter";

const random = new Random(Xorshift32.random());

for (let x = 0; x < 10; x++) for (let z = 0; z < 10; z++) {
    const v: VectorXZ = { x, z };

    const noise = random.perlinNoiseGenerator.noise2({ x: v.x, y: v.z }, {
        amplitude: 1,
        frequency: 1
    });

    world.getDimension(MinecraftDimensionTypes.Overworld).spawnParticle("minecraft:candle_falme_particle", { x, y: noise, z });
}
