declare module "node:fs" {
  export function cpSync(
    source: string,
    destination: string,
    options?: { force?: boolean; recursive?: boolean }
  ): void;
  export function createReadStream(path: string): {
    on(
      event: string,
      listener: (error: unknown) => void
    ): {
      pipe(destination: unknown): void;
    };
  };
  export function statSync(path: string): { isFile(): boolean };
}

declare module "node:path" {
  export function extname(path: string): string;
  export function isAbsolute(path: string): boolean;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
}

declare module "node:process" {
  export const env: Record<string, string | undefined>;
}
