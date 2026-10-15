import { render, screen, fireEvent } from "@testing-library/react-native";
import { Stepper, commitStepperText } from "./Stepper";

const INT = { min: 1, max: 180, allowDecimal: false, fallback: 20 };
const STEPS = { min: 500, max: 100_000, allowDecimal: false, fallback: 5000 };
const KM = { min: 0.5, max: 50, allowDecimal: true, fallback: 5 };

describe("commitStepperText", () => {
  it("keeps a typed number", () => {
    expect(commitStepperText("45", INT)).toBe(45);
    expect(commitStepperText("  45  ", INT)).toBe(45);
  });

  it("clamps to the allowed range", () => {
    expect(commitStepperText("999", INT)).toBe(180);
    expect(commitStepperText("0", INT)).toBe(1);
  });

  it("reads decimals only where the field allows them", () => {
    expect(commitStepperText("2.5", KM)).toBe(2.5);
    expect(commitStepperText("2.5", INT)).toBe(3);
    expect(commitStepperText("1.234", KM)).toBe(1.23);
  });

  it("falls back rather than guessing at junk", () => {
    expect(commitStepperText("", INT)).toBe(20);
    expect(commitStepperText("   ", INT)).toBe(20);
    expect(commitStepperText("abc", INT)).toBe(20);
    expect(commitStepperText("-5", INT)).toBe(20);
    expect(commitStepperText("1e5", INT)).toBe(20);
  });

  it("lets a value below the minimum be typed through on the way up", () => {
    // Why clamping is on commit and not per keystroke: a steps field has a minimum of 500,
    // so clamping "5" per character would rewrite it before "5000" could be reached.
    expect(commitStepperText("5000", STEPS)).toBe(5000);
    expect(commitStepperText("5", STEPS)).toBe(500);
  });
});

describe("Stepper", () => {
  it("renders the value in a field that can be typed into", async () => {
    const onChange = jest.fn();
    await render(
      <Stepper testID="target" value={20} min={1} max={180} suffix="min" onChange={onChange} />,
    );

    expect(screen.getByTestId("target").props.value).toBe("20");
  });

  it("commits a typed number on blur", async () => {
    const onChange = jest.fn();
    await render(<Stepper testID="target" value={20} min={1} max={180} onChange={onChange} />);

    await fireEvent.changeText(screen.getByTestId("target"), "45");
    await fireEvent(screen.getByTestId("target"), "blur");

    expect(onChange).toHaveBeenCalledWith(45);
  });

  it("does not fight a half-typed entry while it is being typed", async () => {
    const onChange = jest.fn();
    await render(
      <Stepper testID="target" value={5000} min={500} max={100000} onChange={onChange} />,
    );

    await fireEvent.changeText(screen.getByTestId("target"), "1");
    expect(screen.getByTestId("target").props.value).toBe("1");
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId("target"), "10000");
    await fireEvent(screen.getByTestId("target"), "blur");

    expect(onChange).toHaveBeenCalledWith(10000);
  });

  it("restores the previous value when the field is left empty", async () => {
    const onChange = jest.fn();
    await render(<Stepper testID="target" value={20} min={1} max={180} onChange={onChange} />);

    await fireEvent.changeText(screen.getByTestId("target"), "");
    await fireEvent(screen.getByTestId("target"), "blur");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("target").props.value).toBe("20");
  });

  it("still nudges with the buttons", async () => {
    const onChange = jest.fn();
    await render(
      <Stepper testID="target" value={20} min={1} max={180} step={5} onChange={onChange} />,
    );

    await fireEvent.press(screen.getByTestId("target-plus"));
    expect(onChange).toHaveBeenCalledWith(25);

    await fireEvent.press(screen.getByTestId("target-minus"));
    expect(onChange).toHaveBeenCalledWith(15);
  });

  it("offers a decimal keypad only for a fractional field", async () => {
    await render(<Stepper testID="int" value={20} min={1} max={180} onChange={jest.fn()} />);
    expect(screen.getByTestId("int").props.keyboardType).toBe("number-pad");

    await render(
      <Stepper testID="km" value={5} min={0.5} max={50} step={0.5} onChange={jest.fn()} />,
    );
    expect(screen.getByTestId("km").props.keyboardType).toBe("decimal-pad");
  });
});
