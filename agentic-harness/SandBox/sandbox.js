import Docker from 'dockerode';
import {readable } from 'stream';

const docker = new Docker();

export async function AgentSandbox {
    let container;
    let timeoutId;
    try {
        container = await docker.createContainer({
            Image: 'node:20-alpine',
            Cmd: ['sh','-c', command],
            HostConfig: {
                NetworkMode: 'none',
                Memory: 256 * 1024 * 1024,
                NanoCpus: 1000000000,
                PidsLimit: 50,
                CapDrop: ['ALL'],
                ReadonlyRootfs: true,

                //temporary space to keep files or to write temp files
                Tmpfs: {'/tmp': 'rw,size=64ms'}
            },
            User: 'node',
            WorkingDir: '/tmp'
        });

        await container.start();

        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(async () => {
                try {
                    console.warn('[Sandbox Timeout] Agent exceeded ${timeoutMs}ms. Killing container...');
                    await container.kill();
                }catch{
                    //container might have already killed
                }
                reject(new Error('Security Exception: Agent execution timeout after ${timeoutMs}ms'));
            }, timeoutMs);
        });

        const executionPromise = container.wait();
        const waitResult = await Promise.race([executionPromise, timeoutPromise]);
        
        clearTimeout(timeoutId);

        const logsBuffer = await container.logs({ stdout: true, stderr: true });
        //Docker multiplexes logs headers contain stream metadata)
        const cleanOutput = logsBuffer.toString('utf8').replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();

        if (waitResult.StatusCode !== 0) {
            throw new Error(`Agent exited with non-zero status code (${waitResult.StatusCode}). Output: ${cleanOutput}`);
        }

        return cleanOutput;

    } catch (error) {
        throw error;
    } finally {
        // Cleanup: Always delete the ephemeral container to free host resources
        if (container) {
        try {
            await container.remove({ force: true });
        } catch (removeError) {
            // Container already cleaned up or missing
        }
    }
  }
}