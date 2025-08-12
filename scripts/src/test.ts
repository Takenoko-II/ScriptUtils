import { system, world } from "@minecraft/server";
import { Random, Xorshift32 } from "./util/Random";
import { MinecraftBlockTypes, MinecraftDimensionTypes } from "./lib/@minecraft/vanilla-data/lib/index";

await system.waitTicks(1);

system.afterEvents.scriptEventReceive.subscribe(e => {
    const random = new Random(new Xorshift32(0));

    for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) for (let z = 0; z < 10; z++) {
        const noise = random.perlinNoiseGenerator.noise3({ x, y, z }, { amplitude: 1, frequency: 0.4 });

        world.getDimension(MinecraftDimensionTypes.Overworld).getBlock({ x, y, z })!!.setType(noise >= 0 ? MinecraftBlockTypes.Stone : MinecraftBlockTypes.Air);
    }
});
