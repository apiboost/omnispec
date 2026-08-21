# Angular Example

Use `<omnispec-renderer>` inside an Angular 18+ standalone component.

## Run it

```bash
pnpm install
pnpm start
```

## Key integration points

1. **Import the WC entry once** so the element is registered with the browser:

   ```ts
   // src/main.ts
   import '@apiboost/omnispec/wc'
   ```

2. **Add `CUSTOM_ELEMENTS_SCHEMA`** to the component (or `NgModule`) so the
   Angular compiler does not error on the unknown `<omnispec-renderer>` tag:

   ```ts
   schemas: [CUSTOM_ELEMENTS_SCHEMA],
   ```

3. **Use a `ViewChild`** to access the element and set complex properties
   imperatively after view init:

   ```ts
   this.docs.nativeElement.sidebarNav = { ... }
   ```

4. **Bind to events** with Angular's standard `(event-name)` syntax — the
   element dispatches standard `CustomEvent`s.

## Why this works

`<omnispec-renderer>` is a standards-compliant custom element. Angular treats
custom elements as a native part of the DOM as long as the schema is declared,
so attribute bindings (`spec-url="..."`), one-way property bindings
(`[spec]="parsedSpec"` work too), and event listeners
(`(spec-loaded)="..."`) all work out of the box.
