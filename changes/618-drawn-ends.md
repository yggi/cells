### Fixed

- **An edge redrawn as another routes that edge's ends** (#618, part 1 of 2): in `drawn(model, routing)`, a role's wire that a frontend draws through its band's petal (radio's `&drums → &drumsOut`, drawn `&band → &drumsOut`) was routed while `&band` wasn't, so the band was drawn as not sounding beside a wire that was. Its ends are routed now, as a junction's already were. What plays doesn't change; Cell studio's "routing, every example" exception for radio comes out at the pin that carries it.
