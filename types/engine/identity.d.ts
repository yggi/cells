/** E0: the texts are equal. */
export declare const byteIdentical: (a: string, b: string) => boolean;
/** E1: equal once comments, whitespace and line continuations are read as one. */
export declare const identicalUpToLayout: (a: string, b: string) => boolean;
/** E2: E1 once each text's own names are numbered in the order it declares them. */
export declare const identicalUpToRenaming: (a: string, b: string) => boolean;
/** E3: E2 after `normalise`, every duplicate in its canonical spelling. */
export declare const normalFormIdentical: (a: string, b: string) => boolean;
