import sys
import asyncio
import base64
import os
import argparse

async def main():
    parser = argparse.ArgumentParser(description="Kyutai Pocket & Neural Speech Synthesizer")
    parser.add_argument("--text", type=str, required=True, help="Text to speak")
    parser.add_argument("--voice", type=str, default="en-US-AriaNeural", help="Voice model")
    parser.add_argument("--rate", type=str, default="+0%", help="Speaking rate")
    parser.add_argument("--pitch", type=str, default="+0Hz", help="Voice pitch adjustment")
    parser.add_argument("--output", type=str, default="", help="Optional output file path")
    parser.add_argument("--base64", action="store_true", help="Output base64 encoded audio to stdout")
    args = parser.parse_args()

    try:
        import edge_tts
        communicate = edge_tts.Communicate(args.text, args.voice, rate=args.rate, pitch=args.pitch)

        if args.output:
            await communicate.save(args.output)
            print(f"SAVED:{args.output}")
        elif args.base64:
            audio_bytes = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_bytes.extend(chunk["data"])
            b64 = base64.b64encode(audio_bytes).decode("ascii")
            print(f"BASE64:{b64}", flush=True)
        else:
            # Default save to temp file
            temp_path = os.path.join(os.environ.get("TEMP", "."), f"speech_{os.getpid()}.mp3")
            await communicate.save(temp_path)
            print(f"SAVED:{temp_path}")
    except Exception as e:
        sys.stderr.write(f"ERROR: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

